package sg.nus.carelink.notification.domain.repository;

import java.util.Optional;

/** Finds the account a signed-in username belongs to, so a person only ever reads their own messages. */
public interface RecipientDirectory {

	Optional<Long> userIdOf(String username);
}
