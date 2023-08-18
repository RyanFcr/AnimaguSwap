import { deploy } from './deploy';
import { communicate } from './communicate';
import { generate } from './generate';
import { commit } from './commit';
import { reveal } from './reveal';

async function main() {
    await deploy();
    await communicate();
    await generate();
    await commit();
    await reveal();
}

main();
