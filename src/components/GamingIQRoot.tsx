import { FirebaseProvider } from "../firebase/FirebaseContext";
import { ErrorBoundary } from "./ErrorBoundary";
import GamingIQApp from "./GamingIQApp";

export default function GamingIQRoot() {
  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <GamingIQApp />
      </FirebaseProvider>
    </ErrorBoundary>
  );
}
