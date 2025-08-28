import React from "react";
import { performance } from "perf_hooks";
import { customRender as render } from "@/lib/test-utils";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock heavy components for performance testing
jest.mock("@/components/maps/MapView", () => {
  return function MockMapView() {
    return <div data-testid="map-view">Mock Map View</div>;
  };
});

jest.mock("@/components/media/VideoCall", () => {
  return function MockVideoCall() {
    return <div data-testid="video-call">Mock Video Call</div>;
  };
});

// Mock fetch for performance tests
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe("Performance Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset performance marks
    performance.clearMarks();
    performance.clearMeasures();
  });

  describe("Component Rendering Performance", () => {
    it("should render large friend lists efficiently", async () => {
      // Generate mock data for 1000 friends
      const largeFriendsList = Array.from({ length: 1000 }, (_, i) => ({
        id: `friend${i}`,
        username: `user${i}`,
        email: `user${i}@example.com`,
        profilePicture: null,
        isOnline: i % 3 === 0,
        lastSeen: new Date(),
      }));

      const FriendsList = ({ friends }: { friends: any[] }) => {
        return (
          <div data-testid="friends-list">
            {friends.map((friend) => (
              <div key={friend.id} data-testid={`friend-${friend.id}`}>
                <span>{friend.username}</span>
                <span>{friend.isOnline ? "Online" : "Offline"}</span>
              </div>
            ))}
          </div>
        );
      };

      // Measure rendering time
      const startTime = performance.now();
      render(<FriendsList friends={largeFriendsList} />);
      const endTime = performance.now();

      const renderTime = endTime - startTime;

      // Should render 1000 items in less than 100ms
      expect(renderTime).toBeLessThan(100);

      // Verify all items are rendered
      expect(screen.getByTestId("friends-list")).toBeInTheDocument();
      expect(screen.getByTestId("friend-friend0")).toBeInTheDocument();
      expect(screen.getByTestId("friend-friend999")).toBeInTheDocument();
    });

    it("should handle rapid user interactions efficiently", async () => {
      const user = userEvent.setup();
      let clickCount = 0;

      const InteractiveComponent = () => {
        const [count, setCount] = React.useState(0);

        const handleClick = () => {
          setCount((prev) => prev + 1);
          clickCount++;
        };

        return (
          <div>
            <button data-testid="click-button" onClick={handleClick}>
              Click me: {count}
            </button>
          </div>
        );
      };

      render(<InteractiveComponent />);
      const button = screen.getByTestId("click-button");

      // Measure time for 100 rapid clicks
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        await user.click(button);
      }

      const endTime = performance.now();
      const interactionTime = endTime - startTime;

      // Should handle 100 clicks in less than 1 second
      expect(interactionTime).toBeLessThan(1000);
      expect(clickCount).toBe(100);
      expect(screen.getByText("Click me: 100")).toBeInTheDocument();
    });

    it("should efficiently update message lists", async () => {
      const initialMessages = Array.from({ length: 100 }, (_, i) => ({
        id: `msg${i}`,
        content: `Message ${i}`,
        senderId: "user1",
        createdAt: new Date(),
      }));

      const MessageList = ({ messages }: { messages: any[] }) => {
        return (
          <div data-testid="message-list">
            {messages.map((message) => (
              <div key={message.id} data-testid={`message-${message.id}`}>
                {message.content}
              </div>
            ))}
          </div>
        );
      };

      const { rerender } = render(<MessageList messages={initialMessages} />);

      // Add 50 new messages and measure update time
      const newMessages = [
        ...initialMessages,
        ...Array.from({ length: 50 }, (_, i) => ({
          id: `msg${100 + i}`,
          content: `New Message ${i}`,
          senderId: "user2",
          createdAt: new Date(),
        })),
      ];

      const startTime = performance.now();
      rerender(<MessageList messages={newMessages} />);
      const endTime = performance.now();

      const updateTime = endTime - startTime;

      // Should update in less than 50ms
      expect(updateTime).toBeLessThan(50);
      expect(screen.getByTestId("message-msg149")).toBeInTheDocument();
    });
  });

  describe("Memory Usage", () => {
    it("should not leak memory during component updates", () => {
      // Mock memory usage tracking
      const memoryUsage: number[] = [];

      const MemoryTestComponent = ({ data }: { data: any[] }) => {
        React.useEffect(() => {
          // Simulate memory usage tracking
          memoryUsage.push(data.length);

          return () => {
            // Cleanup simulation
            memoryUsage.pop();
          };
        }, [data]);

        return (
          <div>
            {data.map((item, index) => (
              <div key={index}>{item.name}</div>
            ))}
          </div>
        );
      };

      const initialData = Array.from({ length: 100 }, (_, i) => ({
        name: `Item ${i}`,
      }));
      const { rerender, unmount } = render(
        <MemoryTestComponent data={initialData} />
      );

      // Update with new data multiple times
      for (let i = 0; i < 10; i++) {
        const newData = Array.from({ length: 100 }, (_, j) => ({
          name: `Item ${i}-${j}`,
        }));
        rerender(<MemoryTestComponent data={newData} />);
      }

      // Unmount component
      unmount();

      // Memory usage should be cleaned up
      expect(memoryUsage.length).toBe(0);
    });

    it("should handle large datasets without memory bloat", () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        data: `Data for item ${i}`.repeat(100), // Make each item larger
      }));

      const DataDisplay = ({ items }: { items: any[] }) => {
        // Use React.memo for performance
        const MemoizedItem = React.memo(({ item }: { item: any }) => (
          <div>{item.name}</div>
        ));

        return (
          <div>
            {items.slice(0, 100).map((item) => (
              <MemoizedItem key={item.id} item={item} />
            ))}
          </div>
        );
      };

      const startTime = performance.now();
      const { unmount } = render(<DataDisplay items={largeDataset} />);
      const endTime = performance.now();

      const renderTime = endTime - startTime;

      // Should render efficiently even with large dataset
      expect(renderTime).toBeLessThan(200);

      // Cleanup
      unmount();
    });
  });

  describe("API Performance", () => {
    it("should handle concurrent API requests efficiently", async () => {
      // Mock multiple API responses with delays
      mockFetch
        .mockImplementationOnce(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () =>
                  resolve({
                    ok: true,
                    json: async () => ({ data: "response1" }),
                  } as Response),
                100
              )
            )
        )
        .mockImplementationOnce(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () =>
                  resolve({
                    ok: true,
                    json: async () => ({ data: "response2" }),
                  } as Response),
                150
              )
            )
        )
        .mockImplementationOnce(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () =>
                  resolve({
                    ok: true,
                    json: async () => ({ data: "response3" }),
                  } as Response),
                80
              )
            )
        );

      const ApiTestComponent = () => {
        const [results, setResults] = React.useState<string[]>([]);
        const [loading, setLoading] = React.useState(false);

        const fetchConcurrent = async () => {
          setLoading(true);
          const startTime = performance.now();

          try {
            // Make concurrent requests
            const promises = [
              fetch("/api/endpoint1"),
              fetch("/api/endpoint2"),
              fetch("/api/endpoint3"),
            ];

            const responses = await Promise.all(promises);
            const data = await Promise.all(responses.map((r) => r.json()));

            const endTime = performance.now();
            const totalTime = endTime - startTime;

            setResults([
              ...data.map((d) => d.data),
              `Total time: ${totalTime}ms`,
            ]);
          } finally {
            setLoading(false);
          }
        };

        return (
          <div>
            <button data-testid="fetch-button" onClick={fetchConcurrent}>
              {loading ? "Loading..." : "Fetch Data"}
            </button>
            <div data-testid="results">
              {results.map((result, i) => (
                <div key={i}>{result}</div>
              ))}
            </div>
          </div>
        );
      };

      const user = userEvent.setup();
      render(<ApiTestComponent />);

      const fetchButton = screen.getByTestId("fetch-button");
      await user.click(fetchButton);

      // Wait for all requests to complete
      await waitFor(() => {
        expect(screen.getByText("response1")).toBeInTheDocument();
        expect(screen.getByText("response2")).toBeInTheDocument();
        expect(screen.getByText("response3")).toBeInTheDocument();
      });

      // Should complete in less than 200ms (concurrent execution)
      const timeResult = screen.getByText(/Total time: \d+ms/);
      const timeMatch = timeResult.textContent?.match(/Total time: (\d+)ms/);
      const totalTime = timeMatch ? parseInt(timeMatch[1]) : 0;

      expect(totalTime).toBeLessThan(200);
    });

    it("should implement efficient caching", async () => {
      const cache = new Map();
      let apiCallCount = 0;

      // Mock API with caching simulation
      mockFetch.mockImplementation(async (url) => {
        apiCallCount++;

        if (cache.has(url)) {
          return {
            ok: true,
            json: async () => cache.get(url),
          } as Response;
        }

        const data = { data: `Response for ${url}`, timestamp: Date.now() };
        cache.set(url, data);

        return {
          ok: true,
          json: async () => data,
        } as Response;
      });

      const CachedComponent = () => {
        const [data, setData] = React.useState<any>(null);

        const fetchData = async () => {
          const response = await fetch("/api/cached-endpoint");
          const result = await response.json();
          setData(result);
        };

        return (
          <div>
            <button data-testid="fetch-button" onClick={fetchData}>
              Fetch Data
            </button>
            {data && (
              <div data-testid="data">
                {data.data} - {data.timestamp}
              </div>
            )}
          </div>
        );
      };

      const user = userEvent.setup();
      render(<CachedComponent />);

      const fetchButton = screen.getByTestId("fetch-button");

      // First request
      await user.click(fetchButton);
      await waitFor(() => {
        expect(screen.getByTestId("data")).toBeInTheDocument();
      });

      const firstTimestamp = screen.getByTestId("data").textContent;

      // Second request (should use cache)
      await user.click(fetchButton);
      await waitFor(() => {
        expect(screen.getByTestId("data")).toBeInTheDocument();
      });

      const secondTimestamp = screen.getByTestId("data").textContent;

      // Should return same cached data
      expect(firstTimestamp).toBe(secondTimestamp);
      // Should only make one actual API call
      expect(apiCallCount).toBe(1);
    });
  });

  describe("Bundle Size and Loading", () => {
    it("should load core components quickly", () => {
      // Simulate component loading time
      const startTime = performance.now();

      // Essential components that should load fast
      const components = [
        () => <div data-testid="header">Header</div>,
        () => <div data-testid="navigation">Navigation</div>,
        () => <div data-testid="sidebar">Sidebar</div>,
      ];

      components.forEach((Component, index) => {
        render(<Component />);
      });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Core components should load in less than 10ms
      expect(loadTime).toBeLessThan(10);
    });

    it("should handle code splitting effectively", async () => {
      // Simulate lazy loading
      const LazyComponent = React.lazy(
        () =>
          new Promise<{ default: React.ComponentType }>((resolve) => {
            setTimeout(() => {
              resolve({
                default: () => (
                  <div data-testid="lazy-component">Lazy Loaded</div>
                ),
              });
            }, 50); // Simulate network delay
          })
      );

      const LazyWrapper = () => (
        <React.Suspense fallback={<div data-testid="loading">Loading...</div>}>
          <LazyComponent />
        </React.Suspense>
      );

      const startTime = performance.now();
      render(<LazyWrapper />);

      // Should show loading state immediately
      expect(screen.getByTestId("loading")).toBeInTheDocument();

      // Wait for lazy component to load
      await waitFor(() => {
        expect(screen.getByTestId("lazy-component")).toBeInTheDocument();
      });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Should load within reasonable time (including simulated delay)
      expect(loadTime).toBeLessThan(100);
    });
  });

  describe("Real-time Performance", () => {
    it("should handle frequent updates efficiently", async () => {
      let updateCount = 0;

      const RealTimeComponent = () => {
        const [messages, setMessages] = React.useState<string[]>([]);

        React.useEffect(() => {
          // Simulate real-time updates
          const interval = setInterval(() => {
            updateCount++;
            setMessages((prev) =>
              [...prev, `Message ${updateCount}`].slice(-10)
            ); // Keep only last 10
          }, 10); // Very frequent updates

          return () => clearInterval(interval);
        }, []);

        return (
          <div data-testid="realtime-messages">
            {messages.map((msg, i) => (
              <div key={i}>{msg}</div>
            ))}
          </div>
        );
      };

      const startTime = performance.now();
      const { unmount } = render(<RealTimeComponent />);

      // Wait for multiple updates
      await new Promise((resolve) => setTimeout(resolve, 100));

      const endTime = performance.now();
      unmount();

      const totalTime = endTime - startTime;

      // Should handle frequent updates without performance degradation
      expect(updateCount).toBeGreaterThan(5);
      expect(totalTime).toBeLessThan(150);
    });
  });
});
