import { AdminWorkspace } from './scheduling/admin-workspace';
import type { SchedulingApi } from './scheduling/api';

export function App({ api }: { api?: SchedulingApi }) {
  return <AdminWorkspace api={api} />;
}

export default App;
