import React from "react";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { customRender as render } from "@/lib/test-utils";
import { loginSchema, registerSchema } from "@/lib/validations";
import { AuthProvider } from "@/context/AuthContext";

// Mock next-auth
jest.mock("next-auth/react");
const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock next/navigation
jest.mock("next/navigation");
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockPush = jest.fn();
const mockReplace = jest.fn();

// Mock fetch for registration
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe("Authentication Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseRouter.mockImplementation(() => ({
      push: mockPush,
      replace: mockReplace,
      refresh: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
    }));
  });

  describe("Validation Schemas", () => {
    describe("Login Validation", () => {
      it("should validate correct login data", () => {
        const validData = {
          email: "test@example.com",
          password: "password123",
        };

        const result = loginSchema.safeParse(validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.email).toBe("test@example.com");
          expect(result.data.password).toBe("password123");
        }
      });

      it("should reject invalid email", () => {
        const invalidData = {
          email: "invalid-email",
          password: "password123",
        };

        const result = loginSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain("email");
        }
      });

      it("should reject short password", () => {
        const invalidData = {
          email: "test@example.com",
          password: "123",
        };

        const result = loginSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain("password");
        }
      });

      it("should reject missing fields", () => {
        const invalidData = {
          email: "",
          password: "",
        };

        const result = loginSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });

    describe("Register Validation", () => {
      it("should validate correct registration data", () => {
        const validData = {
          username: "testuser",
          email: "test@example.com",
          password: "password123",
          confirmPassword: "password123",
        };

        const result = registerSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it("should reject mismatched passwords", () => {
        const invalidData = {
          username: "testuser",
          email: "test@example.com",
          password: "password123",
          confirmPassword: "different123",
        };

        const result = registerSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it("should reject invalid username", () => {
        const invalidData = {
          username: "ab", // too short
          email: "test@example.com",
          password: "password123",
          confirmPassword: "password123",
        };

        const result = registerSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it("should reject weak password", () => {
        const invalidData = {
          username: "testuser",
          email: "test@example.com",
          password: "123", // too short
          confirmPassword: "123",
        };

        const result = registerSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("Login Flow", () => {
    const LoginForm = () => {
      const [email, setEmail] = React.useState("");
      const [password, setPassword] = React.useState("");
      const [loading, setLoading] = React.useState(false);
      const [error, setError] = React.useState("");

      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
          // Validate input
          const validationResult = loginSchema.safeParse({ email, password });
          if (!validationResult.success) {
            setError("Invalid input");
            return;
          }

          const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
          });

          if (result?.error) {
            setError("Invalid credentials");
          } else if (result?.ok) {
            // Redirect on success
            window.location.href = "/dashboard";
          }
        } catch (err) {
          setError("Login failed");
        } finally {
          setLoading(false);
        }
      };

      return (
        <form onSubmit={handleSubmit} data-testid="login-form">
          <input
            data-testid="email-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
          />
          <input
            data-testid="password-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
          <button data-testid="login-button" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
          {error && (
            <div data-testid="error-message" role="alert">
              {error}
            </div>
          )}
        </form>
      );
    };

    it("should handle successful login", async () => {
      const user = userEvent.setup();

      mockSignIn.mockResolvedValue({
        error: null,
        status: 200,
        ok: true,
        url: null,
      });

      // Mock window.location.href
      delete (window as any).location;
      window.location = { href: "" } as any;

      render(<LoginForm />);

      const emailInput = screen.getByTestId("email-input");
      const passwordInput = screen.getByTestId("password-input");
      const loginButton = screen.getByTestId("login-button");

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(loginButton);

      expect(mockSignIn).toHaveBeenCalledWith("credentials", {
        email: "test@example.com",
        password: "password123",
        redirect: false,
      });

      await waitFor(() => {
        expect(window.location.href).toBe("/dashboard");
      });
    });

    it("should handle login failure", async () => {
      const user = userEvent.setup();

      mockSignIn.mockResolvedValue({
        error: "CredentialsSignin",
        status: 401,
        ok: false,
        url: null,
      });

      render(<LoginForm />);

      const emailInput = screen.getByTestId("email-input");
      const passwordInput = screen.getByTestId("password-input");
      const loginButton = screen.getByTestId("login-button");

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "wrongpassword");
      await user.click(loginButton);

      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toBeInTheDocument();
        expect(screen.getByTestId("error-message")).toHaveTextContent(
          "Invalid credentials"
        );
      });
    });

    it("should validate input before submission", async () => {
      const user = userEvent.setup();

      render(<LoginForm />);

      const emailInput = screen.getByTestId("email-input");
      const passwordInput = screen.getByTestId("password-input");
      const loginButton = screen.getByTestId("login-button");

      await user.type(emailInput, "invalid-email");
      await user.type(passwordInput, "123"); // too short
      await user.click(loginButton);

      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toBeInTheDocument();
        expect(screen.getByTestId("error-message")).toHaveTextContent(
          "Invalid input"
        );
      });

      expect(mockSignIn).not.toHaveBeenCalled();
    });

    it("should show loading state during login", async () => {
      const user = userEvent.setup();

      // Make signIn hang to test loading state
      mockSignIn.mockImplementation(() => new Promise(() => {}));

      render(<LoginForm />);

      const emailInput = screen.getByTestId("email-input");
      const passwordInput = screen.getByTestId("password-input");
      const loginButton = screen.getByTestId("login-button");

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(loginButton);

      expect(screen.getByTestId("login-button")).toHaveTextContent(
        "Signing in..."
      );
      expect(screen.getByTestId("login-button")).toBeDisabled();
    });
  });

  describe("Registration Flow", () => {
    const RegisterForm = () => {
      const [formData, setFormData] = React.useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
      const [loading, setLoading] = React.useState(false);
      const [error, setError] = React.useState("");
      const [success, setSuccess] = React.useState(false);

      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
          // Validate input
          const validationResult = registerSchema.safeParse(formData);
          if (!validationResult.success) {
            setError("Invalid input");
            return;
          }

          const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          });

          if (response.ok) {
            setSuccess(true);
          } else {
            const data = await response.json();
            setError(data.error || "Registration failed");
          }
        } catch (err) {
          setError("Registration failed");
        } finally {
          setLoading(false);
        }
      };

      if (success) {
        return (
          <div data-testid="success-message">
            Registration successful! You can now log in.
          </div>
        );
      }

      return (
        <form onSubmit={handleSubmit} data-testid="register-form">
          <input
            data-testid="username-input"
            type="text"
            value={formData.username}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, username: e.target.value }))
            }
            placeholder="Username"
            required
          />
          <input
            data-testid="email-input"
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, email: e.target.value }))
            }
            placeholder="Email"
            required
          />
          <input
            data-testid="password-input"
            type="password"
            value={formData.password}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, password: e.target.value }))
            }
            placeholder="Password"
            required
          />
          <input
            data-testid="confirm-password-input"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                confirmPassword: e.target.value,
              }))
            }
            placeholder="Confirm Password"
            required
          />
          <button
            data-testid="register-button"
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
          {error && (
            <div data-testid="error-message" role="alert">
              {error}
            </div>
          )}
        </form>
      );
    };

    it("should handle successful registration", async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<RegisterForm />);

      await user.type(screen.getByTestId("username-input"), "testuser");
      await user.type(screen.getByTestId("email-input"), "test@example.com");
      await user.type(screen.getByTestId("password-input"), "password123");
      await user.type(
        screen.getByTestId("confirm-password-input"),
        "password123"
      );
      await user.click(screen.getByTestId("register-button"));

      await waitFor(() => {
        expect(screen.getByTestId("success-message")).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "testuser",
          email: "test@example.com",
          password: "password123",
          confirmPassword: "password123",
        }),
      });
    });

    it("should handle registration failure", async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Email already exists" }),
      } as Response);

      render(<RegisterForm />);

      await user.type(screen.getByTestId("username-input"), "testuser");
      await user.type(
        screen.getByTestId("email-input"),
        "existing@example.com"
      );
      await user.type(screen.getByTestId("password-input"), "password123");
      await user.type(
        screen.getByTestId("confirm-password-input"),
        "password123"
      );
      await user.click(screen.getByTestId("register-button"));

      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toHaveTextContent(
          "Email already exists"
        );
      });
    });

    it("should validate password confirmation", async () => {
      const user = userEvent.setup();

      render(<RegisterForm />);

      await user.type(screen.getByTestId("username-input"), "testuser");
      await user.type(screen.getByTestId("email-input"), "test@example.com");
      await user.type(screen.getByTestId("password-input"), "password123");
      await user.type(
        screen.getByTestId("confirm-password-input"),
        "different123"
      );
      await user.click(screen.getByTestId("register-button"));

      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toHaveTextContent(
          "Invalid input"
        );
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("Session Management", () => {
    it("should handle authenticated session", () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "user123",
            email: "test@example.com",
            name: "Test User",
            username: "testuser",
          },
          expires: "2024-12-31T23:59:59.999Z",
        },
        status: "authenticated",
        update: jest.fn(),
      } as any);

      const SessionStatus = () => {
        const { data: session, status } = useSession();

        return (
          <div>
            <div data-testid="status">{status}</div>
            {session?.user && (
              <div data-testid="user-info">
                {session.user.username || session.user.name}
              </div>
            )}
          </div>
        );
      };

      render(<SessionStatus />);

      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
      expect(screen.getByTestId("user-info")).toHaveTextContent("Test User");
    });

    it("should handle unauthenticated session", () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
        update: jest.fn(),
      } as any);

      const SessionStatus = () => {
        const { data: session, status } = useSession();

        return (
          <div>
            <div data-testid="status">{status}</div>
            {!session && <div data-testid="no-session">No session</div>}
          </div>
        );
      };

      render(<SessionStatus />);

      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated");
      expect(screen.getByTestId("no-session")).toBeInTheDocument();
    });

    it("should handle loading session", () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "loading",
        update: jest.fn(),
      } as any);

      const SessionStatus = () => {
        const { status } = useSession();

        return <div data-testid="status">{status}</div>;
      };

      render(<SessionStatus />);

      expect(screen.getByTestId("status")).toHaveTextContent("loading");
    });
  });

  describe("Logout Flow", () => {
    it("should handle successful logout", async () => {
      const user = userEvent.setup();

      mockSignOut.mockResolvedValue({ url: "/login" });

      const LogoutButton = () => {
        const handleLogout = async () => {
          await signOut({ callbackUrl: "/login" });
        };

        return (
          <button data-testid="logout-button" onClick={handleLogout}>
            Logout
          </button>
        );
      };

      render(<LogoutButton />);

      await user.click(screen.getByTestId("logout-button"));

      expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/login" });
    });
  });

  describe("Protected Routes", () => {
    it("should redirect unauthenticated users", () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
        update: jest.fn(),
      } as any);

      const ProtectedComponent = () => {
        const { status } = useSession();
        const router = useRouter();

        React.useEffect(() => {
          if (status === "unauthenticated") {
            router.push("/login");
          }
        }, [status, router]);

        if (status === "loading") {
          return <div>Loading...</div>;
        }

        if (status === "unauthenticated") {
          return null;
        }

        return <div data-testid="protected-content">Protected Content</div>;
      };

      render(<ProtectedComponent />);

      expect(mockPush).toHaveBeenCalledWith("/login");
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    it("should show content for authenticated users", () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "user123",
            email: "test@example.com",
            name: "Test User",
            username: "testuser",
          },
          expires: "2024-12-31T23:59:59.999Z",
        },
        status: "authenticated",
        update: jest.fn(),
      } as any);

      const ProtectedComponent = () => {
        const { status } = useSession();

        if (status === "loading") {
          return <div>Loading...</div>;
        }

        if (status === "unauthenticated") {
          return null;
        }

        return <div data-testid="protected-content">Protected Content</div>;
      };

      render(<ProtectedComponent />);

      expect(screen.getByTestId("protected-content")).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
