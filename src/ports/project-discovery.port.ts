import type { ProjectProfile, ProjectRef } from "../domain/types.js";

export interface ProjectDiscoveryPort {
  createRef(rootPath: string): Promise<ProjectRef>;
  discover(project: ProjectRef): Promise<ProjectProfile>;
  listFiles(rootPath: string): Promise<string[]>;
}
