package sg.nus.carelink.profile.infrastructure.persistence.repository;

import java.util.List;
import java.util.Set;
import org.springframework.data.domain.Pageable;
import java.time.LocalDateTime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import sg.nus.carelink.profile.infrastructure.persistence.entity.ServiceApplicationJpaEntity;

public interface ServiceApplicationJpaRepository extends JpaRepository<ServiceApplicationJpaEntity, Long> {
    long countByApplicantFamilyMemberIdAndElderIdIn(Long familyId, Set<Long> elderIds);
    List<ServiceApplicationJpaEntity> findByApplicantFamilyMemberIdAndElderIdIn(
            Long familyId, Set<Long> elderIds, Pageable pageable);
    List<ServiceApplicationJpaEntity> findByElderIdOrderByCreatedAtDescIdDesc(Long elderId);
    List<ServiceApplicationJpaEntity> findByElderIdInAndStatusNotAndPlannedAtIsNull(Set<Long> elderIds, String status);
    @Transactional
    @Modifying
    @Query(value = "UPDATE care_service_application SET planned_at = :at WHERE id IN (:ids) AND planned_at IS NULL",
            nativeQuery = true)
    int recordPlanned(@Param("ids") Set<Long> ids, @Param("at") LocalDateTime at);
    @Query("SELECT DISTINCT a.elderId FROM ServiceApplicationJpaEntity a WHERE a.elderId IN :elderIds")
    List<Long> findElderIdsIn(@Param("elderIds") Set<Long> elderIds);
}
