// Test only, loaded with --import: the CLI as on a Linux cloud agent computer, where there is no
// secret store and the write mode lives in a file of the profile. So a child process can run in
// write mode "ask" with a real guard, without touching this machine's Keychain.
import os from 'node:os';
import { syncBuiltinESMExports } from 'node:module';

os.platform = () => 'linux';
syncBuiltinESMExports();
