package sg.nus.carelink.identity.api;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import sg.nus.carelink.identity.api.dto.CurrentUserResponse;
import sg.nus.carelink.identity.api.dto.LoginRequest;
import sg.nus.carelink.identity.application.IdentityService;

/**
 * 表现层：只负责 HTTP 的进出与状态码，不含任何业务规则。
 *
 * <p>登出由 Spring Security 的 logout 过滤器处理（见 SecurityConfig），
 * 这里不重复实现。
 */
@RestController
@RequestMapping("/api/auth")
class AuthController {

	private final IdentityService identityService;
	private final SecurityContextRepository contextRepository = new HttpSessionSecurityContextRepository();

	AuthController(IdentityService identityService) {
		this.identityService = identityService;
	}

	@PostMapping("/login")
	CurrentUserResponse login(@Valid @RequestBody LoginRequest request,
			HttpServletRequest httpRequest, HttpServletResponse httpResponse) {

		Authentication authentication = identityService.authenticate(request.username(), request.password());

		// 认证成功后把上下文写进会话，后续请求靠 Cookie 中的 JSESSIONID 识别身份
		SecurityContext context = SecurityContextHolder.createEmptyContext();
		context.setAuthentication(authentication);
		SecurityContextHolder.setContext(context);
		contextRepository.saveContext(context, httpRequest, httpResponse);

		return CurrentUserResponse.from(identityService.require(authentication.getName()));
	}

	@GetMapping("/me")
	CurrentUserResponse me(Authentication authentication) {
		return CurrentUserResponse.from(identityService.require(authentication.getName()));
	}

	@ExceptionHandler(BadCredentialsException.class)
	@ResponseStatus(HttpStatus.UNAUTHORIZED)
	void onBadCredentials() {
		// 刻意不返回具体原因：不区分「账号不存在」与「密码错误」，避免账号枚举
	}
}
