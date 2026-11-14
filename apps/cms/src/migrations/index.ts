import * as migration_20261111_193630_inicial from './20261111_193630_inicial';
import * as migration_20261114_211950_admin_workflows from './20261114_211950_admin_workflows';
import * as admin_guard from './20261114_212000_admin_guard';

export const migrations = [
  {
    up: migration_20261111_193630_inicial.up,
    down: migration_20261111_193630_inicial.down,
    name: '20261111_193630_inicial',
  },
  {
    up: migration_20261114_211950_admin_workflows.up,
    down: migration_20261114_211950_admin_workflows.down,
    name: '20261114_211950_admin_workflows'
  },
  { up: admin_guard.up, down: admin_guard.down, name: '20261114_212000_admin_guard' },
];
