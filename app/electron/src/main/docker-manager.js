const { exec, spawn } = require('child_process');
const http = require('http');
const https = require('https');

class DockerManager {
  constructor(env, cwd) {
    this.env = env;
    this.cwd = cwd;
    this.images = [
      'ghcr.io/ceoatnorthstar/api:latest',
      'ghcr.io/ceoatnorthstar/xrootd:latest',
      'ghcr.io/ceoatnorthstar/streamer:latest'
    ];
  }

  async areImagesPresent() {
    for (const img of this.images) {
      const present = await new Promise(resolve => {
        exec(`docker image inspect ${img}`, { env: this.env }, (err) => resolve(!err));
      });
      if (!present) return false;
    }
    return true;
  }

  pullImages(onProgress) {
    return new Promise((resolve, reject) => {
      // Use docker compose pull to fetch the images defined in the compose file
      const pullProcess = spawn('docker', ['compose', '-p', 'opencern', 'pull'], { cwd: this.cwd, env: this.env });
      
      let lastMessage = '';
      const handleData = (data) => {
        const text = data.toString().trim();
        if (text) {
          // Send last line as progress
          const lines = text.split('\n');
          const last = lines[lines.length - 1];
          // Strip ANSI codes if any
          const clean = last.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
          if (clean !== lastMessage) {
              lastMessage = clean;
              onProgress(clean);
          }
        }
      };

      pullProcess.stdout.on('data', handleData);
      pullProcess.stderr.on('data', handleData);
      
      pullProcess.on('close', code => {
        if (code === 0) resolve();
        else reject(new Error(`Docker pull failed with code ${code}`));
      });
    });
  }

  // Gets the local image digest
  async getLocalDigest(imageName) {
    return new Promise((resolve) => {
      exec(`docker image inspect ${imageName} --format="{{index .RepoDigests 0}}"`, { env: this.env }, (err, stdout) => {
        if (err || !stdout.trim()) {
           resolve(null);
        } else {
           // Output format is usually repo@sha256:digest
           const parts = stdout.trim().split('@');
           resolve(parts.length > 1 ? parts[1] : null);
        }
      });
    });
  }

  // Ping GHCR for the remote digest using Docker Registry V2 API
  async getRemoteDigest(imageName) {
    return new Promise((resolve) => {
      // Extract repo name from ghcr.io/repo:tag
      const repoPath = imageName.replace('ghcr.io/', '').split(':')[0];
      
      // Step 1: Get anonymous bearer token for GHCR
      const tokenUrl = `https://ghcr.io/token?scope=repository:${repoPath}:pull`;
      https.get(tokenUrl, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
          try {
            const token = JSON.parse(body).token;
            // Step 2: Request manifest to get digest
            const manifestUrl = `https://ghcr.io/v2/${repoPath}/manifests/latest`;
            const req = https.get(manifestUrl, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json'
              }
            }, (mRes) => {
              const digest = mRes.headers['docker-content-digest'];
              resolve(digest || null);
            });
            req.on('error', () => resolve(null));
          } catch (e) {
            resolve(null);
          }
        });
      }).on('error', () => resolve(null));
    });
  }

  async checkForUpdates() {
    // Check just the first core image for an update indicator to be fast
    const coreImage = this.images[0];
    const local = await this.getLocalDigest(coreImage);
    if (!local) return false;

    const remote = await this.getRemoteDigest(coreImage);
    if (!remote) return false;

    return local !== remote;
  }
}

module.exports = DockerManager;
