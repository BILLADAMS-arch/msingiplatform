/**
 * Link into practice for a topic. `topicId` is what /api/practice uses to find
 * the topic; the name is for display and keeps older name-only links working.
 */
export function practiceHref(topic: { id?: string | null; name?: string | null }) {
  const qs = new URLSearchParams();
  if (topic.id) qs.set("topicId", topic.id);
  if (topic.name) qs.set("topic", topic.name);
  return `/practice?${qs.toString()}`;
}
