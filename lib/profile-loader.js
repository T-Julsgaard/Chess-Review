// Keep the Player profile code off the review startup path; it loads on first use.
let pending;
export function loadProfileWorkspace() {
  return pending ||= import('./profile/workspace.js').catch(error => {
    pending = null;
    throw error;
  });
}
