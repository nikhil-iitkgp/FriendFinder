import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock fetch for API calls
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe("User Flow Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("API Integration", () => {
    it("should handle successful API response", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { message: "Success" },
        }),
      } as Response);

      const TestComponent = () => {
        const [data, setData] = React.useState<any>(null);
        const [loading, setLoading] = React.useState(false);

        const fetchData = async () => {
          setLoading(true);
          try {
            const response = await fetch("/api/test");
            if (response.ok) {
              const result = await response.json();
              setData(result);
            }
          } catch (error) {
            console.error("Error:", error);
          } finally {
            setLoading(false);
          }
        };

        return (
          <div>
            <button data-testid="fetch-button" onClick={fetchData}>
              {loading ? "Loading..." : "Fetch Data"}
            </button>
            {data && <div data-testid="result">{JSON.stringify(data)}</div>}
          </div>
        );
      };

      const user = userEvent.setup();
      render(<TestComponent />);

      const fetchButton = screen.getByTestId("fetch-button");
      await user.click(fetchButton);

      await waitFor(() => {
        expect(screen.getByTestId("result")).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/test");
      expect(screen.getByTestId("result")).toHaveTextContent("Success");
    });

    it("should handle API errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const TestComponent = () => {
        const [error, setError] = React.useState<string | null>(null);

        const fetchData = async () => {
          try {
            await fetch("/api/test");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
          }
        };

        return (
          <div>
            <button data-testid="fetch-button" onClick={fetchData}>
              Fetch Data
            </button>
            {error && <div data-testid="error-message">{error}</div>}
          </div>
        );
      };

      const user = userEvent.setup();
      render(<TestComponent />);

      const fetchButton = screen.getByTestId("fetch-button");
      await user.click(fetchButton);

      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toBeInTheDocument();
      });

      expect(screen.getByTestId("error-message")).toHaveTextContent(
        "Network error"
      );
    });
  });
});
