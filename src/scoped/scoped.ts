import type {Socket} from "socket.io";
import type {IncomingMessage} from "http";

const stack: WeakMap<IncomingMessage, ScopedInstances> = new WeakMap()

export type ScopedInstances = {
  tunnelId: string
  url: string
  tunnelSocket: Socket
  authToken: string
  authTokenDecoded: unknown
}
export const createScopedInstance = () => {
  return {
    authToken: '',
    authTokenDecoded: null
  }
}

export const scoped = (req: IncomingMessage): ScopedInstances => {
  const scopedInstance = stack.get(req)
  if (scopedInstance) return scopedInstance

  const tmp = createScopedInstance() as ScopedInstances
  stack.set(req, tmp)
  return tmp
}
