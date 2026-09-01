package sg.nus.carelink.shared.error;

/** 请求的资源不存在。映射为 HTTP 404。 */
public class ResourceNotFound extends RuntimeException {

	public ResourceNotFound(String resource, Object id) {
		super("%s [%s] 不存在".formatted(resource, id));
	}
}
