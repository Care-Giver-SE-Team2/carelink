package sg.nus.carelink.shared.web;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import sg.nus.carelink.shared.error.BusinessRuleViolation;
import sg.nus.carelink.shared.error.ResourceNotFound;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Global exception handling. Every error response is an RFC 9457 ProblemDetail,
 * so the front end only ever has to deal with one error shape.
 *
 * <p>Controllers must not catch exceptions and assemble their own error bodies —
 * that is how an error format ends up differing from author to author. The domain
 * layer throws {@link BusinessRuleViolation}; translating it to HTTP happens here.
 */
@RestControllerAdvice
class GlobalExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	@ExceptionHandler(BusinessRuleViolation.class)
	ProblemDetail onBusinessRuleViolation(BusinessRuleViolation ex) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
		problem.setTitle("Operation not allowed by a business rule");
		problem.setProperty("code", ex.code());
		return problem;
	}

	@ExceptionHandler(ResourceNotFound.class)
	ProblemDetail onResourceNotFound(ResourceNotFound ex) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
		problem.setTitle("Resource not found");
		return problem;
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	ProblemDetail onValidationFailure(MethodArgumentNotValidException ex) {
		Map<String, String> fields = new LinkedHashMap<>();
		ex.getBindingResult().getFieldErrors()
				.forEach(error -> fields.putIfAbsent(error.getField(), error.getDefaultMessage()));
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Request validation failed");
		problem.setTitle("Invalid request");
		problem.setProperty("fields", fields);
		return problem;
	}

	@ExceptionHandler(AccessDeniedException.class)
	ProblemDetail onAccessDenied(AccessDeniedException ex) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, "Not permitted to access this resource");
		problem.setTitle("Insufficient permission");
		return problem;
	}

	/** Catch-all. Details go to the log only, never back to the caller, to avoid leaking internals. */
	@ExceptionHandler(Exception.class)
	ProblemDetail onUnexpected(Exception ex) {
		log.error("Unexpected exception", ex);
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(
				HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error, please retry later");
		problem.setTitle("Internal error");
		return problem;
	}
}
