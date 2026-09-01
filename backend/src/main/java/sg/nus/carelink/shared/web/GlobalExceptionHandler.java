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
 * 全局异常处理。统一采用 RFC 9457 的 ProblemDetail 作为错误响应体，
 * 前端只需处理一种错误结构。
 *
 * <p>各模块的控制器不要自己 try-catch 再拼错误响应——那会让错误格式随人而异。
 * 领域层抛 {@link BusinessRuleViolation}，这里负责翻译成 HTTP。
 */
@RestControllerAdvice
class GlobalExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	@ExceptionHandler(BusinessRuleViolation.class)
	ProblemDetail onBusinessRuleViolation(BusinessRuleViolation ex) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
		problem.setTitle("业务规则不允许该操作");
		problem.setProperty("code", ex.code());
		return problem;
	}

	@ExceptionHandler(ResourceNotFound.class)
	ProblemDetail onResourceNotFound(ResourceNotFound ex) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
		problem.setTitle("资源不存在");
		return problem;
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	ProblemDetail onValidationFailure(MethodArgumentNotValidException ex) {
		Map<String, String> fields = new LinkedHashMap<>();
		ex.getBindingResult().getFieldErrors()
				.forEach(error -> fields.putIfAbsent(error.getField(), error.getDefaultMessage()));
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "请求参数校验未通过");
		problem.setTitle("参数不合法");
		problem.setProperty("fields", fields);
		return problem;
	}

	@ExceptionHandler(AccessDeniedException.class)
	ProblemDetail onAccessDenied(AccessDeniedException ex) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, "无权访问该资源");
		problem.setTitle("权限不足");
		return problem;
	}

	/** 兜底。异常细节只进日志，不回传给调用方，避免泄露内部结构。 */
	@ExceptionHandler(Exception.class)
	ProblemDetail onUnexpected(Exception ex) {
		log.error("未预期的异常", ex);
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(
				HttpStatus.INTERNAL_SERVER_ERROR, "服务器内部错误，请稍后重试");
		problem.setTitle("内部错误");
		return problem;
	}
}
