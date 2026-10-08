export async function request(path: string, input: {headers: Record<string,string>; body?: string}) {
  input.headers.Authorization = 'Bearer interactive-session';
  const response = await fetch(path, {method: input.body ? 'POST' : 'GET', ...input});
  if (response.status === 401) throw new Error('session-expired');
  if (!response.ok) throw new Error('request-failed');
  return response.json();
}
