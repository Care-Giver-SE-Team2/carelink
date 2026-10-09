package sg.nus.carelink.identity.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;

import sg.nus.carelink.shared.error.BusinessRuleViolation;
import sg.nus.carelink.shared.security.Role;

/** An issued account replacing its temporary password with one the person chose. */
class IdentityServiceTest {

	private final InMemoryAppUserRepository users = new InMemoryAppUserRepository();
	private final PasswordEncoder encoder = PasswordEncoderFactories.createDelegatingPasswordEncoder();
	private final IdentityService identity = new IdentityService(mock(AuthenticationManager.class), users, encoder);
	private final AccountIssuer.IssuedAccount issued = new AccountIssuerService(users, encoder)
			.issue("Tan Bee Choo", Role.ELDER);

	@Test
	void anIssuedAccountMustChooseItsOwnPasswordAndAChosenOneNeedNot() {
		Long familyId = new AccountIssuerService(users, encoder).register("lim.family", "Lim", "chosen-password",
				Role.FAMILY);

		assertThat(identity.passwordChangeRequired(users.findById(issued.userId()).orElseThrow())).isTrue();
		assertThat(identity.passwordChangeRequired(users.findById(familyId).orElseThrow())).isFalse();
	}

	@Test
	void choosingAPasswordStoresItsHashAndDropsTheTemporaryOne() {
		identity.chooseOwnPassword("tan.bee.choo", "bee-choo-own");

		assertThat(encoder.matches("bee-choo-own", users.passwordHashOf("tan.bee.choo"))).isTrue();
		assertThat(users.findTemporaryPassword(issued.userId())).isEmpty();
		assertThat(identity.passwordChangeRequired(users.findById(issued.userId()).orElseThrow())).isFalse();
	}

	@Test
	void theTemporaryPasswordCannotBeChosenAgain() {
		assertThatThrownBy(() -> identity.chooseOwnPassword("tan.bee.choo", issued.temporaryPassword()))
				.isInstanceOfSatisfying(BusinessRuleViolation.class,
						violation -> assertThat(violation.code()).isEqualTo("SAME_AS_TEMPORARY_PASSWORD"));
		assertThat(users.findTemporaryPassword(issued.userId())).contains(issued.temporaryPassword());
	}

	@Test
	void aPasswordCanBeChosenThisWayOnlyOnce() {
		identity.chooseOwnPassword("tan.bee.choo", "bee-choo-own");

		assertThatThrownBy(() -> identity.chooseOwnPassword("tan.bee.choo", "another-one"))
				.isInstanceOfSatisfying(BusinessRuleViolation.class,
						violation -> assertThat(violation.code()).isEqualTo("PASSWORD_ALREADY_CHOSEN"));
		assertThat(encoder.matches("bee-choo-own", users.passwordHashOf("tan.bee.choo"))).isTrue();
	}
}
