import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Home from "@/pages/Home";
import RequestAccess from "@/pages/RequestAccess";
import ServerMetrics from "@/pages/ServerMetrics";
import Login from "@/pages/Login";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/request-access" component={RequestAccess} />
      <Route path="/login" component={Login} />
      <Route path="/server" component={ServerMetrics} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
