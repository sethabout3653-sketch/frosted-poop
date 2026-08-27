import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FrostedApp } from "./components/frosted/FrostedApp";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FrostedApp />
    </QueryClientProvider>
  );
}

export default App;
