export interface DoctorCheck {
    name: string;
    status: 'ok' | 'warning' | 'error';
    message: string;
    fix?: string;
}
export declare function runDoctorChecks(): Promise<DoctorCheck[]>;
export declare function formatDoctorResults(checks: DoctorCheck[]): string[];
//# sourceMappingURL=doctor.d.ts.map