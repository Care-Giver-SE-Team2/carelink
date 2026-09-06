package sg.nus.carelink.profile.infrastructure.persistence.adapter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;

import sg.nus.carelink.profile.domain.model.ElderFamilyBinding;
import sg.nus.carelink.profile.infrastructure.persistence.entity.ElderFamilyBindingJpaEntity;
import sg.nus.carelink.profile.infrastructure.persistence.repository.ElderFamilyBindingJpaRepository;

/** The adapter delegates to Spring Data and maps at the boundary; nothing else. */
class ElderFamilyBindingRepositoryAdapterTest {

	private final ElderFamilyBindingJpaRepository jpa = mock(ElderFamilyBindingJpaRepository.class);
	private final ElderFamilyBindingRepositoryAdapter adapter = new ElderFamilyBindingRepositoryAdapter(jpa);

	@Test
	void findByIdMapsTheEntityToTheDomainModel() {
		ElderFamilyBindingJpaEntity entity = new ElderFamilyBindingJpaEntity();
		entity.setId(7L);
		when(jpa.findById(7L)).thenReturn(Optional.of(entity));

		Optional<ElderFamilyBinding> found = adapter.findById(7L);

		assertThat(found).isPresent();
		assertThat(found.get().id()).isEqualTo(7L);
	}

	@Test
	void findByIdIsEmptyWhenThereIsNoRow() {
		when(jpa.findById(any())).thenReturn(Optional.empty());

		assertThat(adapter.findById(7L)).isEmpty();
	}

	@Test
	void saveGoesThroughSpringDataAndComesBackAsDomain() {
		ElderFamilyBindingJpaEntity entity = new ElderFamilyBindingJpaEntity();
		entity.setId(7L);
		when(jpa.save(any(ElderFamilyBindingJpaEntity.class))).thenReturn(entity);

		ElderFamilyBinding saved = adapter.save(ElderFamilyBindingMapper.toDomain(entity));

		assertThat(saved).isNotNull();
	}
}
