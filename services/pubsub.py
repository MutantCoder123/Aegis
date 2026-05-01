import asyncio

class FirehosePubSub:
    def __init__(self):
        self.subscribers = []

    def subscribe(self):
        queue = asyncio.Queue()
        self.subscribers.append(queue)
        return queue

    def unsubscribe(self, queue):
        if queue in self.subscribers:
            self.subscribers.remove(queue)

    async def publish(self, event_type, data):
        # Only print in dev or if explicitly needed
        # print(f"[PubSub] Publishing {event_type} to {len(self.subscribers)} subscribers")
        for queue in self.subscribers:
            await queue.put((event_type, data))

# Shared instance for the current process
firehose_pubsub = FirehosePubSub()
