package sg.nus.carelink.profile.domain.service;

import java.time.LocalDateTime;
import sg.nus.carelink.profile.domain.model.ElderFamilyBinding;

/** Rejects a pending request, retaining the domain's transition guard. */
public final class RejectBindingDecision implements BindingDecisionStrategy {
    @Override
    public ElderFamilyBinding apply(ElderFamilyBinding binding, LocalDateTime now) {
        return binding.reject();
    }
}
