package sg.nus.carelink.profile.domain.repository;

import java.util.List;
import java.util.Optional;

import sg.nus.carelink.profile.domain.model.ElderFamilyBinding;

/**
 * Persistence port for elder-family bindings.
 */
public interface ElderFamilyBindingRepository {

    Optional<ElderFamilyBinding> findById(Long id);

    /**
     * Lists all bindings belonging to one elder.
     */
    List<ElderFamilyBinding> findByElderId(Long elderId);

    /**
     * Finds the unique relationship between one elder and one family member.
     */
    Optional<ElderFamilyBinding> findByElderIdAndFamilyMemberId(
            Long elderId,
            Long familyMemberId
    );

    ElderFamilyBinding save(
            ElderFamilyBinding elderFamilyBinding
    );
}