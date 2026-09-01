package sg.nus.carelink.identity.infrastructure.security;

import java.util.Optional;
import java.util.Set;

/**
 * 认证专用的读取端口。
 *
 * <p>为什么不复用领域层的 AppUserRepository？因为密码散列**刻意**不在领域模型里——
 * 它是认证机制的实现细节。让认证自己走一条窄接口取它需要的东西，
 * 领域模型就能保持干净。
 */
interface AuthenticationQuery {

	Optional<Credentials> findCredentials(String username);

	record Credentials(String username, String passwordHash, boolean enabled, Set<String> authorities) {
	}
}
