import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';

const execPromise = promisify(exec);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { toolName, toolInput } = await request.json();

    if (!toolName || !toolInput) {
      return Response.json({ error: 'Missing toolName or toolInput' }, { status: 400 });
    }

    let output = '';
    let hasError = false;
    let images = [];
    
    // Create a temporary workspace for this execution
    const workDir = path.join(os.tmpdir(), `opencern-run-${Date.now()}`);
    fs.mkdirSync(workDir, { recursive: true });

    if (toolName === 'execute_python') {
      const code = toolInput.code;
      if (!code) {
        return Response.json({ error: 'Missing python code' }, { status: 400 });
      }

      // Inject code to capture matplotlib figures if they exist
      const injectedCode = `
import warnings
warnings.filterwarnings('ignore')

import sys
import os

${code}

# Auto-save any matplotlib plots
try:
    import matplotlib.pyplot as plt
    if plt.get_fignums():
        plt.savefig('${workDir}/output.png', bbox_inches='tight', dpi=150)
        print('\\n[OPENCERN_IMAGE_GENERATED: output.png]')
except Exception:
    pass
`;

      const scriptPath = path.join(workDir, 'script.py');
      fs.writeFileSync(scriptPath, injectedCode);

      try {
        // Run python3
        const { stdout, stderr } = await execPromise(`python3 ${scriptPath}`, { 
          cwd: workDir,
          timeout: 60000 // 1 minute timeout
        });
        
        output = stdout;
        if (stderr) output += '\\n--- STDERR ---\\n' + stderr;
        
        // Check for images
        if (fs.existsSync(path.join(workDir, 'output.png'))) {
          // Copy to public dir so frontend can render it
          // In a real app we'd use a robust static asset server or base64
          const base64Image = fs.readFileSync(path.join(workDir, 'output.png'), 'base64');
          images.push(`data:image/png;base64,${base64Image}`);
        }
      } catch (err) {
        hasError = true;
        output = (err.stdout || '') + '\\n--- STDERR ---\\n' + (err.stderr || '') + '\\nError: ' + err.message;
      }
      
    } else if (toolName === 'execute_bash') {
      const command = toolInput.command;
      if (!command) {
        return Response.json({ error: 'Missing bash command' }, { status: 400 });
      }

      // Basic security - in a real enterprise we'd containerize this completely
      const blocked = ['rm -rf /', 'mkfs', 'dd if='];
      if (blocked.some(b => command.includes(b))) {
         return Response.json({ error: 'Command blocked by security policy.' }, { status: 403 });
      }

      try {
        const { stdout, stderr } = await execPromise(command, { 
          cwd: process.cwd(), // Run in the opencern root
          timeout: 60000 
        });
        output = stdout;
        if (stderr) output += '\\n--- STDERR ---\\n' + stderr;
      } catch (err) {
        hasError = true;
        output = (err.stdout || '') + '\\n--- STDERR ---\\n' + (err.stderr || '') + '\\nError: ' + err.message;
      }
      
    } else if (toolName === 'opencern_cli') {
      const args = toolInput.args;
      try {
        // Just stub for now as requested
        output = "Command received: opencern " + args + "\\n\\nThe local OpenCERN CLI integration is under active development. Dataset downloading is not yet available in the chat agent. Please use the Electron UI to download data.";
      } catch (err) {
        hasError = true;
        output = String(err);
      }
    } else {
      return Response.json({ error: `Unknown tool: ${toolName}` }, { status: 400 });
    }

    // Clean up
    try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (e) {}

    // Trim output to prevent context window overflow
    if (output.length > 5000) {
      output = output.substring(0, 5000) + '\\n...[Output truncated due to length]';
    }

    return Response.json({ 
      success: !hasError, 
      output: output.trim() || '(Command executed successfully with no output)',
      images 
    });

  } catch (err) {
    return Response.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
