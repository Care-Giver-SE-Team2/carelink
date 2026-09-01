package sg.nus.carelink.identity.application;

import sg.nus.carelink.identity.domain.model.AppUser;

import java.util.Optional;

/**
 * 跨模块契约：其他四个业务模块需要查账号信息时，只 import 这个接口，
 * 不碰 identity 的 domain 或 infrastructure。
 *
 * <p>这是「接口只在四种场景出现」中的第四种——即便只有一个实现，
 * 它的价值在于把对外可见面收窄到这几个方法，让内部重构不影响别人。
 */
public interface UserDirectory {

	Optional<AppUser> findByUsername(String username);

	Optional<AppUser> findById(Long id);
}
