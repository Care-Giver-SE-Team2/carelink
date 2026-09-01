package sg.nus.carelink.shared.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;

import jakarta.servlet.http.HttpServletResponse;

/**
 * 应用级安全配置。
 *
 * <p>刻意不在这里引用 identity 模块的任何类：UserDetailsService 由 Spring 按类型注入，
 * 从而让依赖方向保持 identity → shared 单向，不产生模块间循环依赖
 * （由 LayerDependencyTest 的循环检查强制）。
 *
 * <p>会话策略：服务端会话 + HttpOnly Cookie，不使用 JWT。
 * 这与提案「服务端渲染优先、无独立 API 网关」的定位一致，也避免了令牌吊销这类额外复杂度。
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
class SecurityConfig {

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		http
				.authorizeHttpRequests(auth -> auth
						// 健康探针必须匿名可访问，否则容器健康检查与流水线冒烟测试拿不到 200
						.requestMatchers("/actuator/health", "/actuator/health/**", "/actuator/info").permitAll()
						// 登录本身不能要求已登录
						.requestMatchers("/api/auth/login").permitAll()
						// 前端静态资源
						.requestMatchers("/", "/index.html", "/favicon.ico", "/assets/**", "/vite.svg").permitAll()
						.anyRequest().authenticated())
				// 前后端同源，CSRF 令牌放在 Cookie 里由前端读取后回填请求头
				.csrf(csrf -> csrf.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse()))
				// 不用表单页与 Basic：登录由 /api/auth/login 处理，未登录一律返回 401 而不是跳转
				.formLogin(AbstractHttpConfigurer::disable)
				.httpBasic(AbstractHttpConfigurer::disable)
				.exceptionHandling(ex -> ex.authenticationEntryPoint(
						(request, response, authException) ->
								response.sendError(HttpServletResponse.SC_UNAUTHORIZED)))
				.logout(logout -> logout
						.logoutUrl("/api/auth/logout")
						.logoutSuccessHandler((request, response, authentication) ->
								response.setStatus(HttpServletResponse.SC_NO_CONTENT))
						.deleteCookies("JSESSIONID"));
		return http.build();
	}

	/** 委派式编码器：库中密码带 {bcrypt} 前缀，日后换算法不必迁移历史数据 */
	@Bean
	PasswordEncoder passwordEncoder() {
		return PasswordEncoderFactories.createDelegatingPasswordEncoder();
	}

	@Bean
	AuthenticationManager authenticationManager(UserDetailsService userDetailsService, PasswordEncoder passwordEncoder) {
		DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
		provider.setPasswordEncoder(passwordEncoder);
		return new ProviderManager(provider);
	}
}
