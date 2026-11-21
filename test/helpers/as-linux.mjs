import { syncBuiltinESMExports } from "node:module";
import os from "node:os";

os.platform = () => "linux";
syncBuiltinESMExports();
