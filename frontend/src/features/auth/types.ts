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
  /** True while the account still has the temporary password it was issued (an elder's, on approval). */
  passwordChangeRequired?: boolean
}
