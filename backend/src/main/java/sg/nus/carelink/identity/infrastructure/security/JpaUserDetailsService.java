package sg.nus.carelink.identity.infrastructure.security;

import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 把数据库里的账号翻译成 Spring Security 认得的 UserDetails。
 *
 * <p>它被 shared.security.SecurityConfig 按类型注入——SecurityConfig 不 import 本类，
 * 因此 shared 不依赖 identity，模块间不产生循环依赖。
 */
@Service
class JpaUserDetailsService implements UserDetailsService {

	private final AuthenticationQuery query;

	JpaUserDetailsService(AuthenticationQuery query) {
		this.query = query;
	}

	@Override
	@Transactional(readOnly = true)
	public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
		AuthenticationQuery.Credentials credentials = query.findCredentials(username)
				.orElseThrow(() -> new UsernameNotFoundException("账号不存在：" + username));
		return User.withUsername(credentials.username())
				.password(credentials.passwordHash())
				.authorities(credentials.authorities().toArray(String[]::new))
				.disabled(!credentials.enabled())
				.build();
	}
}
