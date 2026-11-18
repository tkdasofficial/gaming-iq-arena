import { BackendProvider } from "../backend/BackendContext";
import { ErrorBoundary } from "./ErrorBoundary";
import GamingIQApp from "./GamingIQApp";

export default function GamingIQRoot() {
  return (
    <ErrorBoundary>
      <BackendProvider>
        <GamingIQApp />
      </BackendProvider>
    </ErrorBoundary>
  );
}
