#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

interface WorkspaceInfo {
  location: string;
  workspaceDependencies: string[];
  mismatchedWorkspaceDependencies: string[];
}

interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface TempPackageJson {
  name: string;
  version: string;
  dependencies: Record<string, string>;
}

function checkWorkspaces(): void {
  console.log('🔍 Checking workspaces for outdated packages...\n');

  // Get workspace info
  const workspacesInfoRaw = execSync('yarn workspaces info', { encoding: 'utf8' });
  const workspacesInfo: Record<string, WorkspaceInfo> = JSON.parse(workspacesInfoRaw);

  for (const [workspaceName, workspaceData] of Object.entries(workspacesInfo)) {
    console.log(`📦 Checking ${workspaceName}...`);
    
    const packageJsonPath = join(workspaceData.location, 'package.json');
    
    if (existsSync(packageJsonPath)) {
      const packageJson: PackageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      
      // Get dependencies excluding workspace ones
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      const externalDeps = Object.entries(deps).filter(([name, version]: [string, string]) => {
        return !version.startsWith('workspace:') && name !== 'ui' && !name.startsWith('@repo/');
      });
      
      if (externalDeps.length === 0) {
        console.log('  ✅ No external dependencies to check\n');
        continue;
      }
      
      try {
        // Create temp package.json with only external deps
        const tempDir = join(workspaceData.location, '.temp-check');
        const tempPackageJson: TempPackageJson = {
          name: `${workspaceName}-temp`,
          version: '1.0.0',
          dependencies: Object.fromEntries(externalDeps)
        };
        
        mkdirSync(tempDir, { recursive: true });
        writeFileSync(
          join(tempDir, 'package.json'), 
          JSON.stringify(tempPackageJson, null, 2)
        );
        
        // Run yarn outdated in temp directory
        const result = execSync('yarn outdated', { 
          cwd: tempDir,
          encoding: 'utf8',
          stdio: 'pipe'
        });
        
        console.log(result);
        
        // Cleanup
        rmSync(tempDir, { recursive: true, force: true });
        
      } catch (error) {
        // yarn outdated exits with code 1 when packages are outdated
        const errorOutput = (error as { stdout?: string }).stdout;
        
        if (errorOutput && errorOutput.includes('Package')) {
          console.log(errorOutput);
        } else {
          console.log('  ✅ All packages up to date');
        }
        
        // Cleanup
        const tempDir = join(workspaceData.location, '.temp-check');
        if (existsSync(tempDir)) {
          rmSync(tempDir, { recursive: true, force: true });
        }
      }
    }
    
    console.log('');
  }

  console.log('✅ Workspace check completed!');
}

checkWorkspaces(); 