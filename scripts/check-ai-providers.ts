import { getProviderDiagnostics } from '../config/ai';

export function runProviderDiagnostics(): void {
  const diagnostics = getProviderDiagnostics();

  console.log('============================================================');
  console.log('AI NEXUS BLOCK — PROVIDER CASCADE DIAGNOSTICS');
  console.log('============================================================');
  console.log('Order | Provider ID      | Label               | Configuration');
  console.log('------+------------------+---------------------+--------------');

  for (const item of diagnostics) {
    const orderStr = String(item.order).padStart(5, ' ');
    const idStr = item.provider.padEnd(16, ' ');
    const labelStr = item.label.padEnd(19, ' ');
    console.log(`${orderStr} | ${idStr} | ${labelStr} | ${item.status}`);
  }

  console.log('============================================================');
}

if (require.main === module || (typeof process !== 'undefined' && process.argv[1]?.includes('check-ai-providers'))) {
  runProviderDiagnostics();
}
