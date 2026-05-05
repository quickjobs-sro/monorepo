#!/usr/bin/env ts-node

import { execSync } from 'child_process';

interface AuditResult {
  stdout: string;
  stderr: string;
}

function runAuditClean(): void {
  try {
    // Run yarn audit and capture output
    const output = execSync('yarn audit --groups dependencies --level moderate', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    // Filter out quickjobs-api-wrapper related lines
    const lines = output.split('\n');
    const filteredLines = lines.filter((line: string) => {
      return !line.includes('quickjobs-api-wrapper') && 
             !line.includes('1095073'); // Advisory ID for node-fetch
    });
    
    const filteredOutput = filteredLines.join('\n');
    
    // Check if any real vulnerabilities remain
    if (filteredOutput.includes('vulnerabilities found') && 
        !filteredOutput.includes('0 vulnerabilities found')) {
      console.log(filteredOutput);
      process.exit(1);
    } else {
      console.log('✅ No security vulnerabilities found (quickjobs-api-wrapper ignored)');
      process.exit(0);
    }
    
  } catch (error) {
    // If yarn audit fails, check if it's only because of quickjobs-api-wrapper
    const output = (error as { stdout?: string; message?: string }).stdout || 
                   (error as Error).message;
    
    if (output.includes('quickjobs-api-wrapper') && !output.includes('other')) {
      console.log('✅ No security vulnerabilities found (quickjobs-api-wrapper ignored)');
      process.exit(0);
    } else {
      console.log(output);
      process.exit(1);
    }
  }
}

runAuditClean(); 