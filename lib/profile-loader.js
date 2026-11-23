// Keep the Player profile code off the review startup path; it loads on first use.
let pending, story;
export function loadProfileWorkspace() {
  return pending ||= import('./profile/workspace.js').catch(error => {
    pending = null;
    throw error;
  });
}
export function loadProfileStory() {
  return story ||= import('./profile/designs/story.js').catch(error => {
    story = null;
    throw error;
  });
}
