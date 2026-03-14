import { setSessionUser } from '../../utils/session';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const body = await readBody(event);
  const { username, password } = body;

  if (username === config.adminUser && password === config.adminPass) {
    setSessionUser(event, username);
    return { success: true };
  }

  throw createError({ statusCode: 401, statusMessage: 'Invalid username or password' });
});
