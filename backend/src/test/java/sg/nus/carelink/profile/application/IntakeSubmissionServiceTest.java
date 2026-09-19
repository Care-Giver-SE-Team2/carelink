package sg.nus.carelink.profile.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.security.access.AccessDeniedException;

import sg.nus.carelink.identity.application.UserDirectory;
import sg.nus.carelink.identity.domain.model.AppUser;
import sg.nus.carelink.profile.domain.model.FamilyMember;
import sg.nus.carelink.profile.domain.model.IntakeApplication;
import sg.nus.carelink.profile.domain.model.IntakeSubmission;
import sg.nus.carelink.profile.domain.repository.IntakeApplicationRepository;
import sg.nus.carelink.shared.security.Role;

/**
 * Verifies applicant ownership, access checks and storage failure handling.
 *
 * @author Wang Zhili
 */
class IntakeSubmissionServiceTest {

	private final Map<String, AppUser> accounts = Map.of(
			"family-a", new AppUser(7L, "family-a", "Family A", Set.of(Role.FAMILY), true),
			"manager", new AppUser(10L, "manager", "Manager", Set.of(Role.MANAGER), true),
			"disabled", new AppUser(11L, "disabled", "Disabled family", Set.of(Role.FAMILY), false),
			"no-profile", new AppUser(12L, "no-profile", "Missing family profile", Set.of(Role.FAMILY), true));
	private final UserDirectory users = new UserDirectory() {
		@Override
		public Optional<AppUser> findByUsername(String username) {
			return Optional.ofNullable(accounts.get(username));
		}

		@Override
		public Optional<AppUser> findById(Long id) {
			return accounts.values().stream().filter(user -> user.id().equals(id)).findFirst();
		}
	};
	private final InMemoryFamilyMemberRepository families = new InMemoryFamilyMemberRepository();
	private final InMemoryIntakeApplicationRepository applications = new InMemoryIntakeApplicationRepository();
	private final IntakeSubmissionService service = new IntakeSubmissionService(users, families, applications);

	@BeforeEach
	void prepareFamilyProfiles() {
		families.save(new FamilyMember(42L, 7L, "Family A", null, null, null, null));
		families.save(new FamilyMember(7L, 9L, "Family B", null, null, null, null));
		families.save(new FamilyMember(53L, 10L, "Manager profile", null, null, null, null));
		families.save(new FamilyMember(54L, 11L, "Disabled family profile", null, null, null, null));
	}

	@Test
	void submitsForTheFamilyLinkedToTheAuthenticatedAccountWithoutAnElderBinding() {
		IntakeApplication saved = service.submit("family-a", minimumDetails());

		assertThat(saved.id()).isNotNull();
		assertThat(saved.applicantFamilyMemberId()).isEqualTo(42L);
		assertThat(saved.status()).isEqualTo(IntakeApplication.Status.SUBMITTED);
		assertThat(saved.elderId()).isNull();
		assertThat(applications.findById(saved.id())).contains(saved);
	}

	@ParameterizedTest
	@NullAndEmptySource
	@ValueSource(strings = { " ", "unknown", "manager", "disabled", "no-profile" })
	void refusesSubmissionWithoutAnEnabledFamilyAccountAndProfile(String username) {
		assertThatThrownBy(() -> service.submit(username, minimumDetails()))
				.isInstanceOf(AccessDeniedException.class);
		assertThat(applications.findById(1L)).isEmpty();
	}

	@Test
	void propagatesStorageFailureInsteadOfReturningASuccessfulSubmission() {
		var failure = new DataAccessResourceFailureException("Test database unavailable");
		var unavailableStorage = new IntakeApplicationRepository() {
			@Override
			public Optional<IntakeApplication> findById(Long id) {
				throw failure;
			}

			@Override
			public IntakeApplication save(IntakeApplication application) {
				throw failure;
			}
		};
		var failingService = new IntakeSubmissionService(users, families, unavailableStorage);

		assertThatThrownBy(() -> failingService.submit("family-a", minimumDetails())).isSameAs(failure);
	}

	private IntakeSubmission minimumDetails() {
		return new IntakeSubmission("Tan Mei", null, "12 Example Road", "123456", null, null, null, null);
	}
}
