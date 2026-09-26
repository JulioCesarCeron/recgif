import { spawnSync } from 'node:child_process';
import process from 'node:process';

const image = 'recgif-emscripten:4.0.7';

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log('Verificando imagem Docker...');

// tenta encontrar a imagem
const inspect = spawnSync(
  'docker',
  [ 'image', 'inspect', image ],
  { stdio: 'ignore' }
);

if (inspect.status !== 0) {
  console.log('Construindo imagem Docker do Emscripten...');
  
  run(
    'docker',
    ['build', '-t', image, './core']
  );
}

console.log('Compilando WASM...');

run('docker', [
  'run',
  '--rm',
  '-v',
  `${process.cwd()}:/work`,
  '-w',
  '/work',
  image,
  'bash',
  'core/build-wasm.sh'
]);