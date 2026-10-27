package sg.nus.carelink.profile.domain.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import sg.nus.carelink.profile.domain.model.ElderFamilyBinding;
import sg.nus.carelink.shared.error.BusinessRuleViolation;

class BindingDecisionStrategyTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 27, 10, 30);

    private ElderFamilyBinding binding(ElderFamilyBinding.Status status) {
        return new ElderFamilyBinding(42L, 1L, 3L,
                ElderFamilyBinding.Relationship.SON, false,
                ElderFamilyBinding.AccessScope.FULL, status,
                null, null, null, null);
    }

    @Test
    void factorySelectsConfirmStrategy() {
        assertThat(BindingDecisionStrategy.of(true))
                .isInstanceOf(ConfirmBindingDecision.class);
    }

    @Test
    void factorySelectsRejectStrategy() {
        assertThat(BindingDecisionStrategy.of(false))
                .isInstanceOf(RejectBindingDecision.class);
    }

    @Test
    void confirmTransitionsPendingToActiveAndRecordsTime() {
        ElderFamilyBinding original = binding(ElderFamilyBinding.Status.PENDING_CONFIRMATION);
        ElderFamilyBinding result = BindingDecisionStrategy.of(true).apply(original, NOW);
        assertThat(result.status()).isEqualTo(ElderFamilyBinding.Status.ACTIVE);
        assertThat(result.confirmedAt()).isEqualTo(NOW);
        assertThat(result.id()).isEqualTo(original.id());
        assertThat(original.status()).isEqualTo(ElderFamilyBinding.Status.PENDING_CONFIRMATION);
    }

    @Test
    void rejectTransitionsPendingToRejectedWithoutConfirmationTime() {
        ElderFamilyBinding result = BindingDecisionStrategy.of(false)
                .apply(binding(ElderFamilyBinding.Status.PENDING_CONFIRMATION), NOW);
        assertThat(result.status()).isEqualTo(ElderFamilyBinding.Status.REJECTED);
        assertThat(result.confirmedAt()).isNull();
    }

    @Test
    void confirmRejectsEveryNonPendingStatus() {
        for (ElderFamilyBinding.Status status : ElderFamilyBinding.Status.values()) {
            if (status == ElderFamilyBinding.Status.PENDING_CONFIRMATION) continue;
            assertThatThrownBy(() -> BindingDecisionStrategy.of(true).apply(binding(status), NOW))
                    .isInstanceOfSatisfying(BusinessRuleViolation.class,
                            ex -> assertThat(ex.code()).isEqualTo("FAMILY_BINDING_NOT_PENDING"));
        }
    }

    @Test
    void rejectRejectsEveryNonPendingStatus() {
        for (ElderFamilyBinding.Status status : ElderFamilyBinding.Status.values()) {
            if (status == ElderFamilyBinding.Status.PENDING_CONFIRMATION) continue;
            assertThatThrownBy(() -> BindingDecisionStrategy.of(false).apply(binding(status), NOW))
                    .isInstanceOfSatisfying(BusinessRuleViolation.class,
                            ex -> assertThat(ex.code()).isEqualTo("FAMILY_BINDING_NOT_PENDING"));
        }
    }

    @Test
    void confirmRequiresNonNullTimestamp() {
        assertThatThrownBy(() -> BindingDecisionStrategy.of(true)
                .apply(binding(ElderFamilyBinding.Status.PENDING_CONFIRMATION), null))
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    void rejectDoesNotNeedTimestamp() {
        assertThat(BindingDecisionStrategy.of(false)
                .apply(binding(ElderFamilyBinding.Status.PENDING_CONFIRMATION), null).status())
                .isEqualTo(ElderFamilyBinding.Status.REJECTED);
    }
}
