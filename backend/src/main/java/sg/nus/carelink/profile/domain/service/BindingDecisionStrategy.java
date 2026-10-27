package sg.nus.carelink.profile.domain.service;

import java.time.LocalDateTime;
import sg.nus.carelink.profile.domain.model.ElderFamilyBinding;

/** A family member's decision policy for a pending elder-family binding. */
public interface BindingDecisionStrategy {

    ElderFamilyBinding apply(ElderFamilyBinding binding, LocalDateTime now);

    static BindingDecisionStrategy of(boolean approve) {
        return approve ? new ConfirmBindingDecision() : new RejectBindingDecision();
    }
}
