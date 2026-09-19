package sg.nus.carelink.shared.security;

import java.io.IOException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import tools.jackson.databind.json.JsonMapper;

/**
 * Returns the standard problem format for requests rejected before reaching a controller.
 *
 * @author Wang Zhili
 */
class SecurityProblemHandler implements AuthenticationEntryPoint, AccessDeniedHandler {

	private final JsonMapper json;

	SecurityProblemHandler(JsonMapper json) {
		this.json = json;
	}

	@Override
	public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException exception)
			throws IOException {
		write(response, HttpStatus.UNAUTHORIZED, "Authentication required", "A valid authenticated session is required");
	}

	@Override
	public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException exception)
			throws IOException {
		write(response, HttpStatus.FORBIDDEN, "Insufficient permission", "Request is not permitted");
	}

	private void write(HttpServletResponse response, HttpStatus status, String title, String detail) throws IOException {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
		problem.setTitle(title);
		response.setStatus(status.value());
		response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
		json.writeValue(response.getOutputStream(), problem);
	}
}
