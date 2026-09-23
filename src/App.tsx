import { AppShell } from "@/app/AppShell";
import { NotificationHost } from "@/components";

function App() {
  return (
    <NotificationHost>
      <AppShell />
    </NotificationHost>
  );
}

export default App;
