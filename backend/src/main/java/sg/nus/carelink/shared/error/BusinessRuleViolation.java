package sg.nus.carelink.shared.error;

/**
 * 业务规则被违反。由领域层抛出，映射为 HTTP 409。
 *
 * <p>放在 shared.error 而不是某个模块的 domain 包里，是为了让五个模块的领域层
 * 都能依赖它，同时它本身是纯 Java——不引 Spring、不引 JPA，
 * 因此不会破坏「领域层可脱离框架单元测试」这条约束。
 */
public class BusinessRuleViolation extends RuntimeException {

	private final String code;

	public BusinessRuleViolation(String code, String message) {
		super(message);
		this.code = code;
	}

	/** 稳定的机器可读标识，前端据此做本地化文案，不解析 message */
	public String code() {
		return code;
	}
}
