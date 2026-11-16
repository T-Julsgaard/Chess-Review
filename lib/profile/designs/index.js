// Player profile designs — Settings → Visual → Player profile picks one. All
// share the workspace's data, engine check and share link; only the panel and
// the board scenes differ.
import {DesignWorkspace} from './base.js';
import {StoryWorkspace} from './story.js';
import {BentoWorkspace} from './bento.js';
import {EditorialWorkspace} from './editorial.js';

export const PROFILE_DESIGNS = [
  {id: 'classic', label: 'Classic', description: 'The original slide deck.', Workspace: DesignWorkspace},
  {id: 'story', label: 'Story', description: 'One big figure per chapter, charts drawn on the board, autoplay.', Workspace: StoryWorkspace},
  {id: 'bento', label: 'Dashboard', description: 'Everything at a glance in tiles; hover to preview, click to open.', Workspace: BentoWorkspace},
  {id: 'editorial', label: 'Editorial', description: 'One scrolling magazine page; the board follows the chapter you read.', Workspace: EditorialWorkspace},
];
export function profileWorkspaceClass(id) {
  return (PROFILE_DESIGNS.find(design => design.id === id) || PROFILE_DESIGNS[0]).Workspace;
}
