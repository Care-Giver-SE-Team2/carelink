package sg.nus.carelink.identity.application;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import sg.nus.carelink.identity.domain.model.AppUser;
import sg.nus.carelink.identity.domain.repository.AppUserRepository;
import sg.nus.carelink.shared.error.ResourceNotFound;

/**
 * 认证相关的用例编排。
 *
 * <p>注意这里是一个普通的类，没有配套的 {@code IdentityServiceImpl}——
 * 只有一个实现、又不被跨模块调用的服务不需要接口。
 * 接口只在四种场景出现，见 docs/目录结构与分层规则.md 第四节。
 */
@Service
public class IdentityService {

	private final AuthenticationManager authenticationManager;
	private final AppUserRepository users;

	IdentityService(AuthenticationManager authenticationManager, AppUserRepository users) {
		this.authenticationManager = authenticationManager;
		this.users = users;
	}

	/** 校验凭据，成功返回已认证的 Authentication，失败抛 AuthenticationException */
	public Authentication authenticate(String username, String rawPassword) {
		return authenticationManager.authenticate(
				UsernamePasswordAuthenticationToken.unauthenticated(username, rawPassword));
	}

	public AppUser require(String username) {
		return users.findByUsername(username)
				.orElseThrow(() -> new ResourceNotFound("账号", username));
	}
}
