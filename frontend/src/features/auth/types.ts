export interface SignInCredentials {
  username: string
  password: string
}

/**
 * User identity returned by the session login endpoint.
 * @author Wang Zhili
 */
export interface CurrentUser {
  id: number
  username: string
  displayName: string
  roles: string[]
}
