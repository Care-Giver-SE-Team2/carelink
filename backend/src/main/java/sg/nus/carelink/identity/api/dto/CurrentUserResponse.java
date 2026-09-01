package sg.nus.carelink.identity.api.dto;

import sg.nus.carelink.identity.domain.model.AppUser;

import java.util.List;

/**
 * 前端据 roles 决定进哪一套界面（主管桌面端 / 护理员 / 家属 / 老人）。
 */
public record CurrentUserResponse(Long id, String username, String displayName, List<String> roles) {

	public static CurrentUserResponse from(AppUser user) {
		return new CurrentUserResponse(
				user.id(),
				user.username(),
				user.displayName(),
				user.roles().stream().map(Enum::name).sorted().toList());
	}
}
