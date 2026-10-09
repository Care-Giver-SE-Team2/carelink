package sg.nus.carelink.identity.controller.dto;

import sg.nus.carelink.identity.domain.model.AppUser;

import java.util.List;

/**
 * The front end decides which set of screens to show based on the roles listed here.
 * {@code passwordChangeRequired} is true while the account still has the temporary password it
 * was issued; the elder app then asks the elder to choose their own before anything else.
 */
public record CurrentUserResponse(Long id, String username, String displayName, List<String> roles,
		boolean passwordChangeRequired) {

	public static CurrentUserResponse from(AppUser user, boolean passwordChangeRequired) {
		return new CurrentUserResponse(
				user.id(),
				user.username(),
				user.displayName(),
				user.roles().stream().map(Enum::name).sorted().toList(),
				passwordChangeRequired);
	}
}
