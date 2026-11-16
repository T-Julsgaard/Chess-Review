// Keep the Player profile code off the review startup path; it loads on first use.
let pending, designs;
export function loadProfileWorkspace() {
  return pending ||= import('./profile/workspace.js').catch(error => {
    pending = null;
    throw error;
  });
}
/** The design registry (Settings → Visual → Player profile); it imports the workspace too. */
export function loadProfileDesigns() {
  return designs ||= import('./profile/designs/index.js').catch(error => {
    designs = null;
    throw error;
  });
}
