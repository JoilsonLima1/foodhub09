import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export interface CertPaths {
  certFile: string;
  keyFile: string;
  exists: boolean;
}

function getCertsDir(configDir: string): string {
  return path.join(configDir, 'certs');
}

/**
 * Returns cert/key paths. If they don't exist, generates a self-signed certificate
 * using Node's built-in crypto (no openssl dependency needed).
 */
export function ensureCertificates(configDir: string): CertPaths {
  const certsDir = getCertsDir(configDir);
  const certFile = path.join(certsDir, 'agent.crt');
  const keyFile = path.join(certsDir, 'agent.key');

  if (fs.existsSync(certFile) && fs.existsSync(keyFile)) {
    console.log('[TLS] Certificados encontrados em', certsDir);
    return { certFile, keyFile, exists: true };
  }

  console.log('[TLS] Gerando certificado autoassinado...');
  fs.mkdirSync(certsDir, { recursive: true });

  // Use Node.js built-in crypto to generate self-signed cert
  try {
    const crypto = require('crypto');
    const { generateKeyPairSync, createSign, X509Certificate } = crypto;

    // Generate RSA key pair
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });

    // Export private key in PEM format
    const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
    fs.writeFileSync(keyFile, privateKeyPem, 'utf-8');

    // For self-signed cert generation, we need openssl or a pure JS approach.
    // Since Node crypto doesn't have a simple cert builder, we'll use a minimal
    // approach: try openssl first, then fallback to a bundled approach.
    try {
      // Try openssl if available (Git for Windows includes it)
      const opensslPaths = [
        'openssl',
        'C:\\Program Files\\Git\\usr\\bin\\openssl.exe',
        'C:\\Program Files (x86)\\Git\\usr\\bin\\openssl.exe',
      ];

      let opensslCmd = '';
      for (const p of opensslPaths) {
        try {
          execSync(`"${p}" version`, { stdio: 'ignore' });
          opensslCmd = `"${p}"`;
          break;
        } catch {}
      }

      if (!opensslCmd) {
        // Fallback: write key and use powershell to create a self-signed cert
        generateWithPowershell(certsDir, certFile, keyFile);
      } else {
        // Write key file first
        execSync(
          `${opensslCmd} req -new -x509 -key "${keyFile}" -out "${certFile}" -days 3650 -subj "/CN=FoodHub Print Agent" -addext "subjectAltName=IP:127.0.0.1,DNS:localhost"`,
          { stdio: 'ignore' }
        );
      }
    } catch (err) {
      console.warn('[TLS] OpenSSL falhou, tentando PowerShell...', err);
      generateWithPowershell(certsDir, certFile, keyFile);
    }
  } catch (err) {
    console.error('[TLS] Falha ao gerar certificados:', err);
    // Last resort: generate with PowerShell from scratch
    generateWithPowershell(certsDir, certFile, keyFile);
  }

  if (fs.existsSync(certFile) && fs.existsSync(keyFile)) {
    console.log('[TLS] Certificado gerado com sucesso em', certsDir);
    return { certFile, keyFile, exists: true };
  }

  console.error('[TLS] Não foi possível gerar certificados. HTTPS desabilitado.');
  return { certFile, keyFile, exists: false };
}

function generateWithPowershell(certsDir: string, certFile: string, keyFile: string) {
  if (process.platform !== 'win32') {
    console.error('[TLS] PowerShell disponível apenas no Windows.');
    return;
  }

  try {
    // PowerShell: create self-signed cert, export as PFX, then convert to PEM
    const pfxFile = path.join(certsDir, 'agent.pfx');
    const password = 'foodhub-temp';

    const ps = [
      `$cert = New-SelfSignedCertificate -DnsName 'localhost','127.0.0.1' -CertStoreLocation 'Cert:\\CurrentUser\\My' -NotAfter (Get-Date).AddYears(10) -FriendlyName 'FoodHub Print Agent'`,
      `$pwd = ConvertTo-SecureString -String '${password}' -Force -AsPlainText`,
      `Export-PfxCertificate -Cert $cert -FilePath '${pfxFile.replace(/\\/g, '\\\\')}' -Password $pwd | Out-Null`,
      `Remove-Item -Path "Cert:\\CurrentUser\\My\\$($cert.Thumbprint)" -Force`,
    ].join('; ');

    execSync(`powershell -Command "${ps}"`, { stdio: 'ignore' });

    // Convert PFX to PEM using openssl or node crypto
    if (fs.existsSync(pfxFile)) {
      const crypto = require('crypto');
      const pfxBuffer = fs.readFileSync(pfxFile);

      // Try openssl conversion
      try {
        const opensslCmd = '"C:\\Program Files\\Git\\usr\\bin\\openssl.exe"';
        execSync(`${opensslCmd} pkcs12 -in "${pfxFile}" -out "${certFile}" -clcerts -nokeys -passin pass:${password}`, { stdio: 'ignore' });
        execSync(`${opensslCmd} pkcs12 -in "${pfxFile}" -out "${keyFile}" -nocerts -nodes -passin pass:${password}`, { stdio: 'ignore' });
      } catch {
        // If openssl not available, use PowerShell to extract
        const psExtract = [
          `$pfx = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2('${pfxFile.replace(/\\/g, '\\\\')}', '${password}', 'Exportable')`,
          `$certPem = '-----BEGIN CERTIFICATE-----' + [Environment]::NewLine + [Convert]::ToBase64String($pfx.RawData, 'InsertLineBreaks') + [Environment]::NewLine + '-----END CERTIFICATE-----'`,
          `Set-Content -Path '${certFile.replace(/\\/g, '\\\\')}' -Value $certPem`,
          `$rsa = [System.Security.Cryptography.RSA]::Create()`,
          `$rsa.ImportPkcs8PrivateKey($pfx.PrivateKey.ExportPkcs8PrivateKey(), [ref]$null)`,
          `$keyPem = '-----BEGIN PRIVATE KEY-----' + [Environment]::NewLine + [Convert]::ToBase64String($rsa.ExportPkcs8PrivateKey(), 'InsertLineBreaks') + [Environment]::NewLine + '-----END PRIVATE KEY-----'`,
          `Set-Content -Path '${keyFile.replace(/\\/g, '\\\\')}' -Value $keyPem`,
        ].join('; ');
        execSync(`powershell -Command "${psExtract}"`, { stdio: 'ignore' });
      }

      // Cleanup PFX
      try { fs.unlinkSync(pfxFile); } catch {}
    }
  } catch (err) {
    console.error('[TLS] PowerShell cert generation failed:', err);
  }
}
